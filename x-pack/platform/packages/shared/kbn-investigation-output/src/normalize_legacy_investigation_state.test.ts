/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_RECOMMENDATIONS,
  MAX_TEXT_LENGTH,
  investigationStateSchema,
} from '@kbn/significant-events-schema';
import { normalizeLegacyInvestigationState } from './normalize_legacy_investigation_state';

describe('normalizeLegacyInvestigationState', () => {
  it('extracts the conclusion section body from markdown', () => {
    const legacyConclusion = `# Conclusion
Checkout deploy introduced a regression.

## Next Steps
- Roll back checkout deployment · Revert commit abc123 and monitor error rate.
- Add canary deploy guardrail · Block deploys when error rate exceeds baseline.`;

    expect(
      normalizeLegacyInvestigationState({
        summary: 'Investigate latency spike on web-frontend.',
        hypotheses: [],
        conclusion: legacyConclusion,
      })
    ).toEqual(
      expect.objectContaining({
        conclusion: 'Checkout deploy introduced a regression.',
      })
    );
  });

  it('lifts Next Steps bullets out of the conclusion into recommendations when recommendations is absent', () => {
    const legacyConclusion = `# Conclusion
Checkout deploy introduced a regression.

## Next Steps
- Roll back checkout deployment · Revert commit abc123 and monitor error rate.
- Add canary deploy guardrail · Block deploys when error rate exceeds baseline.`;

    expect(
      normalizeLegacyInvestigationState({
        summary: 'Investigate latency spike on web-frontend.',
        hypotheses: [],
        conclusion: legacyConclusion,
      })
    ).toEqual(
      expect.objectContaining({
        recommendations: [
          {
            title: 'Roll back checkout deployment',
            description: 'Revert commit abc123 and monitor error rate.',
          },
          {
            title: 'Add canary deploy guardrail',
            description: 'Block deploys when error rate exceeds baseline.',
          },
        ],
      })
    );
  });

  it('keeps em-dash bullets intact and attaches code blocks to the preceding bullet', () => {
    const legacyConclusion = `# Conclusion
Auth middleware blocks on DB lookups.

## Next Steps
- **Immediate mitigation** — roll back api-gateway to v2.8.0:**
\`\`\`shell
kubectl rollout undo deployment/api-gateway
kubectl rollout status deployment/api-gateway
\`\`\`
- Verify auth middleware recovery — confirm 200 responses resume and 5xx rate drops to zero:
- Monitor web-frontend latency recovery — P95 should return to ~480ms within 5–10 minutes of gateway recovery:`;

    expect(
      normalizeLegacyInvestigationState({
        summary: 'Investigate api-gateway latency.',
        hypotheses: [],
        conclusion: legacyConclusion,
      })
    ).toEqual(
      expect.objectContaining({
        recommendations: [
          {
            title: '**Immediate mitigation** — roll back api-gateway to v2.8.0',
            code: 'kubectl rollout undo deployment/api-gateway\nkubectl rollout status deployment/api-gateway',
          },
          {
            title:
              'Verify auth middleware recovery — confirm 200 responses resume and 5xx rate drops to zero',
          },
          {
            title:
              'Monitor web-frontend latency recovery — P95 should return to ~480ms within 5–10 minutes of gateway recovery',
          },
        ],
      })
    );
  });

  it('lifts numbered Next Steps items, not just dash bullets', () => {
    const legacyConclusion = `## Conclusion
Checkout deploy introduced a regression.

## Next Steps

1. **Roll back the checkout deployment** — the regression is confirmed
2. Add a canary deploy guardrail
3) Alert when the error rate exceeds baseline`;

    expect(
      normalizeLegacyInvestigationState({
        summary: 'Investigate latency spike on web-frontend.',
        hypotheses: [],
        conclusion: legacyConclusion,
      })
    ).toEqual(
      expect.objectContaining({
        recommendations: [
          { title: '**Roll back the checkout deployment** — the regression is confirmed' },
          { title: 'Add a canary deploy guardrail' },
          { title: 'Alert when the error rate exceeds baseline' },
        ],
      })
    );
  });

  it('treats a # comment inside a fenced code block as code, not as the heading that ends the section', () => {
    const legacyConclusion = `## Conclusion
SSH is exposed to the internet.

## Next Steps

- **Harden sshd** to reduce the attack surface:
  \`\`\`ini
  # /etc/ssh/sshd_config
  PermitRootLogin no
  \`\`\`
- **Deploy fail2ban** to block repeat offenders`;

    expect(
      normalizeLegacyInvestigationState({
        summary: 'Investigate SSH brute-force attempts.',
        hypotheses: [],
        conclusion: legacyConclusion,
      })
    ).toEqual(
      expect.objectContaining({
        recommendations: [
          {
            title: '**Harden sshd** to reduce the attack surface',
            code: '# /etc/ssh/sshd_config\nPermitRootLogin no',
          },
          { title: '**Deploy fail2ban** to block repeat offenders' },
        ],
      })
    );
  });

  it('strips the list indentation a nested code block carries', () => {
    const legacyConclusion = `## Conclusion
The test account is still enabled.

## Next Steps

1. **Lock the account**:
   \`\`\`bash
   passwd -l test
   if [ $? -ne 0 ]; then
     userdel -r test
   fi
   \`\`\``;

    expect(
      normalizeLegacyInvestigationState({
        summary: 'Investigate the test account.',
        hypotheses: [],
        conclusion: legacyConclusion,
      })
    ).toEqual(
      expect.objectContaining({
        recommendations: [
          {
            title: '**Lock the account**',
            code: 'passwd -l test\nif [ $? -ne 0 ]; then\n  userdel -r test\nfi',
          },
        ],
      })
    );
  });

  it('bounds only the recommendation title, keeping the full description of an overlong bullet', () => {
    const description = `Roll back the deploy. ${'x'.repeat(600)}`;

    const parsed = investigationStateSchema.safeParse(
      normalizeLegacyInvestigationState({
        summary: 'Investigate latency spike on web-frontend.',
        hypotheses: [],
        conclusion: `## Conclusion\nCheckout deploy introduced a regression.\n\n## Next Steps\n- Mitigate the regression. ${description}`,
      })
    );

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }
    const [recommendation] = parsed.data.recommendations ?? [];
    expect(recommendation?.title).toBe('Mitigate the regression.');
    expect(recommendation?.description).toBe(description);
  });

  it('bounds an overlong bullet description so the payload still parses', () => {
    const parsed = investigationStateSchema.safeParse(
      normalizeLegacyInvestigationState({
        summary: 'Investigate latency spike on web-frontend.',
        hypotheses: [],
        conclusion: `## Conclusion\nCheckout deploy introduced a regression.\n\n## Next Steps\n- Mitigate the regression. ${'x'.repeat(
          MAX_TEXT_LENGTH + 100
        )}`,
      })
    );

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }
    const [recommendation] = parsed.data.recommendations ?? [];
    expect(recommendation?.description).toHaveLength(MAX_TEXT_LENGTH);
    expect(recommendation?.description?.endsWith('…')).toBe(true);
  });

  it('bounds an overlong code block so the payload still parses', () => {
    const parsed = investigationStateSchema.safeParse(
      normalizeLegacyInvestigationState({
        summary: 'Investigate latency spike on web-frontend.',
        hypotheses: [],
        conclusion: `## Conclusion\nCheckout deploy introduced a regression.\n\n## Next Steps\n- Roll back the deploy:\n\`\`\`bash\n${'echo x\n'.repeat(
          MAX_TEXT_LENGTH / 4
        )}\`\`\``,
      })
    );

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }
    const [recommendation] = parsed.data.recommendations ?? [];
    expect(recommendation?.code).toHaveLength(MAX_TEXT_LENGTH);
  });

  it('caps recovered recommendations at the schema maximum so the payload still parses', () => {
    const bullets = Array.from(
      { length: MAX_RECOMMENDATIONS + 3 },
      (_unused, index) => `${index + 1}. Remediation step ${index + 1}`
    ).join('\n');

    const parsed = investigationStateSchema.safeParse(
      normalizeLegacyInvestigationState({
        summary: 'Investigate latency spike on web-frontend.',
        hypotheses: [],
        conclusion: `## Conclusion\nCheckout deploy introduced a regression.\n\n## Next Steps\n${bullets}`,
      })
    );

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }
    expect(parsed.data.recommendations).toHaveLength(MAX_RECOMMENDATIONS);
    expect(parsed.data.conclusion).toBe('Checkout deploy introduced a regression.');
  });

  it('does not lift Next Steps bullets when recommendations is already populated', () => {
    const state = {
      summary: 'Investigate latency spike on web-frontend.',
      hypotheses: [],
      conclusion: `# Conclusion
Checkout deploy introduced a regression.

## Next Steps
- Roll back checkout deployment · Revert commit abc123 and monitor error rate.`,
      recommendations: [{ title: 'Roll back the deploy' }],
    };

    expect(normalizeLegacyInvestigationState(state)).toEqual(
      expect.objectContaining({ recommendations: [{ title: 'Roll back the deploy' }] })
    );
  });

  it('maps legacy gaps_found entries to blind_spots when blind_spots is absent', () => {
    expect(
      normalizeLegacyInvestigationState({
        summary: 'Investigate latency spike on web-frontend.',
        hypotheses: [],
        gaps_found: ['No traces available for the cart service.'],
      })
    ).toEqual(
      expect.objectContaining({
        blind_spots: [
          {
            title: 'No traces available for the cart service.',
            description: 'No traces available for the cart service.',
          },
        ],
      })
    );
  });

  it('truncates an overlong gaps_found entry for the bounded blind_spot title, keeping the full text in description', () => {
    const gap = `No traces available for the cart service. ${'x'.repeat(600)}`;

    const parsed = investigationStateSchema.safeParse(
      normalizeLegacyInvestigationState({
        summary: 'Investigate latency spike on web-frontend.',
        hypotheses: [],
        gaps_found: [gap],
      })
    );

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }
    const [blindSpot] = parsed.data.blind_spots ?? [];
    expect(blindSpot?.description).toBe(gap);
    expect(blindSpot?.title.length).toBeLessThan(gap.length);
    expect(blindSpot?.title.endsWith('…')).toBe(true);
  });

  it('bounds a gaps_found entry longer than the description limit rather than failing the payload', () => {
    const parsed = investigationStateSchema.safeParse(
      normalizeLegacyInvestigationState({
        summary: 'Investigate latency spike on web-frontend.',
        hypotheses: [],
        gaps_found: [`No traces for the cart service. ${'x'.repeat(MAX_TEXT_LENGTH)}`],
      })
    );

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }
    const [blindSpot] = parsed.data.blind_spots ?? [];
    expect(blindSpot?.description).toHaveLength(MAX_TEXT_LENGTH);
    expect(blindSpot?.description.endsWith('…')).toBe(true);
  });

  it('returns the payload by reference — does not remap gaps_found — when blind_spots is already populated', () => {
    const state = {
      summary: 'Investigate latency spike on web-frontend.',
      hypotheses: [],
      gaps_found: ['Legacy gap that should be ignored'],
      blind_spots: [{ title: 'Missing traces', description: 'No traces for the cart service.' }],
    };

    expect(normalizeLegacyInvestigationState(state)).toBe(state);
  });

  it('recovers a legacy payload with both next steps and gaps_found so it survives investigationStateSchema.safeParse', () => {
    const legacyPayload = {
      summary: 'Investigate latency spike on web-frontend.',
      hypotheses: [],
      conclusion: `# Conclusion
Checkout deploy introduced a regression.

## Next Steps
- Roll back checkout deployment · Revert commit abc123 and monitor error rate.`,
      gaps_found: ['No traces available for the cart service.'],
    };

    const parsed = investigationStateSchema.safeParse(
      normalizeLegacyInvestigationState(legacyPayload)
    );

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }
    expect(parsed.data.conclusion).toBe('Checkout deploy introduced a regression.');
    expect(parsed.data.recommendations).toEqual([
      {
        title: 'Roll back checkout deployment',
        description: 'Revert commit abc123 and monitor error rate.',
      },
    ]);
    expect(parsed.data.blind_spots).toEqual([
      {
        title: 'No traces available for the cart service.',
        description: 'No traces available for the cart service.',
      },
    ]);
  });

  it('returns a current payload by reference, without reaching the recovery logic', () => {
    const currentPayload = {
      summary: 'Investigate latency spike on web-frontend.',
      hypotheses: [],
      conclusion: 'Checkout deploy introduced a regression.',
      recommendations: [{ title: 'Roll back the deploy' }],
      blind_spots: [{ title: 'Missing traces', description: 'No traces for the cart service.' }],
    };

    expect(normalizeLegacyInvestigationState(currentPayload)).toBe(currentPayload);
  });

  it('does not read a prose conclusion opening with #1 as a heading, so it stays a current payload', () => {
    const currentPayload = {
      summary: 'Investigate latency spike on web-frontend.',
      hypotheses: [],
      conclusion: '#1 offender was the checkout deploy, which introduced a connection leak.',
    };

    expect(normalizeLegacyInvestigationState(currentPayload)).toBe(currentPayload);
  });

  it('passes through payloads that do not even loosely resemble an investigation state', () => {
    expect(normalizeLegacyInvestigationState(undefined)).toBeUndefined();
    expect(normalizeLegacyInvestigationState('not an object')).toBe('not an object');
  });
});
