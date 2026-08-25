/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  badge,
  codeBlock,
  contextStrip,
  descriptionList,
  text,
  view,
} from '@kbn/adaptive-ui/builders';
import type { BodyNode, ViewSpec } from '@kbn/adaptive-ui';
import { titleCase } from './shared';

interface MitreTechnique {
  id: string;
  name: string;
}

interface MitreThreat {
  technique?: MitreTechnique[];
}

/**
 * Mirror of the `RuleResponse` fields the alternate render reads. The full type
 * lives in `@kbn/security-solution-plugin`; only the presentational subset is
 * mirrored so this package stays decoupled from Security.
 */
export interface SecurityRule {
  name: string;
  type: string;
  description?: string;
  severity?: string;
  risk_score?: number;
  query?: string;
  language?: string;
  index?: string[];
  tags?: string[];
  threat?: MitreThreat[];
}

/**
 * The `security.rule` attachment payload ([rule_attachment.tsx](../../../../../solutions/security/plugins/security_solution/public/agent_builder/attachment_types/rule/rule_attachment.tsx)):
 * a JSON-serialized `RuleResponse` in `text`.
 */
export interface SecurityRuleData {
  text: string;
  attachmentLabel?: string;
}

const mitreLabel = (threat?: MitreThreat[]): string | undefined => {
  const technique = threat?.[0]?.technique?.[0];
  return technique ? `${technique.id} — ${technique.name}` : undefined;
};

const queryLanguageToken = (language?: string): string =>
  language === 'lucene' ? 'lucene' : 'kql';

/**
 * Alternate rendering for the `security.rule` attachment: a detection rule as an
 * inline `Severity | Risk score` context strip over a `descriptionList` mixing a
 * prose author, the highlighted query `codeBlock`, and `badge` rows for index
 * patterns and tags.
 */
export const buildSecurityRuleViewSpec = (rule: SecurityRule): ViewSpec => {
  // Derived from the builder's own input, not annotated with the exported
  // `BodyNode`: that is the two-pack union, and a components primitive's nested
  // child slot only accepts the components pack's own — a `donut` cannot sit
  // inside a description list.
  type DescriptionListItem = Parameters<typeof descriptionList>[0]['items'][number];
  const items: DescriptionListItem[] = [];

  if (rule.query) {
    items.push({
      title: 'Custom query',
      description: codeBlock({ language: queryLanguageToken(rule.language), code: rule.query }),
    });
  }
  if (rule.index && rule.index.length > 0) {
    items.push({
      title: 'Index patterns',
      description: badge({ items: rule.index.map((label) => ({ label })) }),
    });
  }
  if (rule.tags && rule.tags.length > 0) {
    items.push({
      title: 'Tags',
      description: badge({ items: rule.tags.map((label) => ({ label })) }),
    });
  }
  const mitre = mitreLabel(rule.threat);
  if (mitre) {
    items.push({ title: 'MITRE ATT&CK', description: mitre });
  }

  const body: BodyNode[] = [
    contextStrip({
      separator: 'pipe',
      items: [
        { type: 'pair', label: 'Severity', value: titleCase(rule.severity ?? 'unknown') },
        { type: 'pair', label: 'Risk score', value: String(rule.risk_score ?? 0) },
      ],
    }),
  ];

  if (rule.description) {
    body.push(text({ format: 'markdown', body: rule.description }));
  }
  if (items.length > 0) {
    body.push(descriptionList({ label: 'Rule', items }));
  }

  return view({ title: rule.name, subtitle: `Detection rule · ${rule.type}`, body });
};

export const toSecurityRuleViewSpec = ({ text: json }: SecurityRuleData): ViewSpec =>
  buildSecurityRuleViewSpec(JSON.parse(json) as SecurityRule);

export const sampleSecurityRule: SecurityRule = {
  name: 'Encoded PowerShell execution',
  type: 'query',
  severity: 'high',
  risk_score: 73,
  description:
    'Flags `powershell.exe` invocations that carry an encoded command line, a common execution and defense-evasion technique. Matches on process start events across the Windows fleet and enriches with the originating user and parent process.',
  query: 'process.name : "powershell.exe" and process.args : ("-enc" or "-EncodedCommand")',
  language: 'kuery',
  index: ['logs-*', 'winlogbeat-*'],
  tags: ['Windows', 'Execution', 'Elastic'],
  threat: [{ technique: [{ id: 'T1059.001', name: 'PowerShell' }] }],
};

export const sampleSecurityRuleAttachment: SecurityRuleData = {
  text: JSON.stringify(sampleSecurityRule),
};
