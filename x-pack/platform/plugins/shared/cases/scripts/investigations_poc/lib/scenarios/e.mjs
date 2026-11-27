// Scenario E: audit six months later. A SOX-scoped alert (INV-0991) closed 182 days ago with preserved evidence.
import { ensureAlerts } from '../alerts.mjs';
import {
  DATA,
  newCtx,
  runStandard,
  actorOf,
  verdictOf,
  closeRecordApi,
  userAuth,
  buildExtendedFields,
  CLOSE_VALUES,
  verdictEnumOf,
  summarize,
  protoT,
  DAY,
} from './common.mjs';

export const id = 'E';

const PROMPTS = {
  m1: 'Triage the privileged login to pay-db-01 and check the change calendar.',
  m2: 'Is there a change that covers the login?',
  m4: 'What verdict do you hold until someone reviews the session content?',
};

/** Prototype labels read "182 days ago" for everything; the real times are the morning of the incident. */
const abs = (ctx, h, m, s = 0) => {
  const d = new Date(protoT(ctx.sc, h, m, s));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p = (n) => String(n).padStart(2, '0');
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} @ ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
};

const EVIDENCE_AT = { E1: [2, 17, 30], E2: [2, 18], E3: [2, 19], E4: [2, 20], E5: [2, 52], E6: [2, 58], E7: [2, 30], E8: [2, 32], E9: [3, 35], E10: [3, 6], E11: [3, 10], E12: [4, 41] };
const CLAIM_AT = {
  C1: [[6, 30], [3, 15], [2, 20]],
  C2: [[6, 31], [2, 55], [2, 20]],
  C3: [[4, 45], [2, 35], [2, 20]],
  C4: [[6, 35], [2, 20]],
  C5: [[6, 36], [3, 40], [2, 20]],
};

export const run = async () => {
  // Anchor the close (prototype 07:12 on the incident day) exactly 182 days before now.
  const realNow = Date.now();
  const closeProto = protoT(DATA.scenarios.E.sc, 7, 12, 0);
  const ctx = newCtx('E', { anchorProto: closeProto, anchorReal: realNow - 182 * DAY, realNow });

  const t = ctx.t;
  const tw = actorOf('TW');
  const bw = actorOf('BW');
  const st = ctx.d.state;
  const closed = st.closed;

  // Re-time the "182 days ago" labels.
  ctx.sc.hist.forEach((h) => {
    if (h.what === 'Description') h.w = abs(ctx, 2, 17, 0);
    if (h.what === 'Conclusion C3') h.w = abs(ctx, ...CLAIM_AT.C3[0]);
    if (h.what === 'Closing summary') h.w = abs(ctx, 6, 45, 0);
  });
  for (const c of st.claims) {
    const times = CLAIM_AT[c.id];
    c.hist.forEach((h, i) => {
      h.w = abs(ctx, ...times[i]);
    });
  }
  ctx.d.arg.V.when = abs(ctx, 2, 40, 0);
  st.cm.E6.forEach((c) => {
    if (c.w === '182 days ago') c.w = abs(ctx, 3, 20, 0);
  });

  const decisionAt = { p1: t(4, 10), p2: t(3, 20), p3: t(4, 20), p4: t(5, 30) };
  const finalClosing = ctx.sc.hist[0];
  const analystLog = st.log.find((l) => /^Set the determination/.test(l.t));
  const concludeLog = st.log.find((l) => /concluded inconclusive/.test(l.t));

  const result = await runStandard(
    ctx,
    {
      createdProto: t(2, 17, 0),
      creator: tw,
      alerts: {
        spec: (c) => ({
          count: 1,
          hosts: ['pay-db-01'],
          users: ['svc-breakglass-dba'],
          rules: [{ name: 'Privileged Login Outside Change Window', severity: 'high', risk_score: 73, reason: 'authentication event', sourceIp: '10.30.4.52' }],
          start: c.clock.iso(t(2, 14, 44)),
          end: c.clock.iso(t(2, 14, 44)),
          defaults: { host: 'pay-db-01', user: 'svc-breakglass-dba' },
        }),
      },
      evidenceTimeOf: (e) => protoT(ctx.sc, ...EVIDENCE_AT[e.id]),
      scopeActor: 'TW',
      // Item updates cannot be backdated; skip them so the closed record shows no activity from today.
      linkEntityEvidence: false,
      scopeCreatedProto: t(2, 21, 0),
      taskActorCode: 'TW',
      taskCreatedProto: t(2, 17, 10),
      proposals: {
        actorCode: 'TW',
        meta: Object.fromEntries(Object.keys(decisionAt).map((k) => [k, { createdProto: t(2, 40, 0), decisionProto: decisionAt[k] }])),
      },
      timelineActor: 'TW',
      timelineCreatedProto: t(2, 25, 0),
      patches: (c) => [
        { tsMs: c.clock.ms(t(2, 40, 0)), body: { agent_verdict: verdictOf(c), actor: tw } },
        { tsMs: c.clock.ms(t(3, 0, 0)), body: { owner: bw, actor: bw } },
        { tsMs: c.clock.ms(analystLog.ts), body: { analyst_verdict: { verdict: verdictEnumOf(st.analyst.v), reason: st.analyst.why }, actor: bw } },
      ],
      skipLog: (l) => /^Closed the (investigation|\d+ alerts?)/.test(l.t) || l === analystLog || l === concludeLog,
      skipHistory: (h) => h === finalClosing,
      conversations: { prompts: PROMPTS, prompter: 'BW', mainActor: 'BW' },
      // The two analysts who worked it, assigned before the close.
      assignees: { codes: ['BW', 'DR'], actor: 'BW', tsMs: ctx.clock.ms(t(3, 0, 0)) },
      close: async (c) => {
        // Closed as Braxton, so the closing note is his case comment.
        await closeRecordApi(
          c.recordId,
          {
            // Close-required fields are passed on the close: the template's own plus the root cause notes.
            extended_fields: await buildExtendedFields(st.procType, {
              ...CLOSE_VALUES[st.procType],
              root_cause_notes: `${closed.cause}. ${c.clock.text(closed.summary)}`,
            }),
            // The Cases reason sets the human verdict; the prototype's "Authorized activity" is the summary's story.
            close_reason: 'benign_positive',
            summary: c.clock.text(closed.summary),
            actor: bw,
            closed_at: new Date(realNow - 182 * DAY).toISOString(),
          },
          userAuth('BW')
        );
      },
    },
    { ensureAlerts }
  );
  return { ctx, result, summary: await summarize(ctx, { related: result.related.length }) };
};
