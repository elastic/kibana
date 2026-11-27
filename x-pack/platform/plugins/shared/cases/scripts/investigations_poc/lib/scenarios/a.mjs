// Scenario A: shift start, the Triage worker concluded false positive on 40 grouped port scan alerts (INV-226).
import { ensureAlerts } from '../alerts.mjs';
import { newCtx, runStandard, actorOf, verdictOf, summarize, DAY } from './common.mjs';

export const id = 'A';

const SERVERS = [
  'srv-fin-01', 'srv-db-03', 'srv-web-07', 'srv-app-12', 'srv-hr-02', 'srv-ldap-01',
  'srv-mail-04', 'srv-file-05', 'srv-erp-06', 'srv-crm-08', 'srv-bi-09', 'srv-dns-02',
];

const PROMPTS = {
  m1: 'Group the 40 port scan alerts by source and target.',
  m2: 'Who owns the source address, and is there a change window for it?',
  m3: 'What is your verdict, and what is left to check?',
};

export const run = async () => {
  const ctx = newCtx('A');
  const t = ctx.t;
  const tw = actorOf('TW', ctx.obo);
  const lastLogMs = Math.max(...ctx.d.state.log.map((l) => l.ts));
  const concluded = ctx.d.state.log.find((l) => /^Concluded /.test(l.t));

  const result = await runStandard(
    ctx,
    {
      createdProto: t(2, 3, 0),
      creator: tw,
      alerts: {
        spec: (c) => ({
          count: 40,
          hosts: SERVERS,
          users: ['svc-scanner'],
          rules: [
            {
              name: 'Potential Port Scan Detected',
              severity: 'medium',
              risk_score: 47,
              reason: 'network event',
              sourceIp: '10.20.9.14',
              destinationIps: ['10.20.1.10', '10.20.2.11', '10.20.3.12', '10.20.4.13'],
            },
          ],
          start: c.clock.iso(t(2, 0, 20)),
          end: c.clock.iso(t(2, 2, 20)),
          defaults: { host: SERVERS[0], user: 'svc-scanner' },
        }),
      },
      extraAlertsActor: 'TW',
      scopeActor: 'TW',
      scopeCreatedProto: t(2, 5, 10),
      taskActorCode: 'TW',
      taskCreatedProto: t(2, 3, 10),
      // The last required task (close out) is open and due tomorrow; the optional scanner-log task has no date.
      taskExtras: { t5: { due: DAY, assignees: ['PK'] } },
      assignees: { codes: ['PK'], actor: 'PK' },
      proposals: { actorCode: 'TW', meta: { default: { createdProto: t(7, 45, 0) } } },
      timelineActor: 'TW',
      timelineCreatedProto: t(2, 5, 0),
      patches: (c) => [{ tsMs: c.clock.ms(concluded.ts), body: { agent_verdict: verdictOf(c), actor: tw } }],
      skipLog: (l) => l === concluded,
      conversations: { prompts: PROMPTS, prompter: 'PK', mainActor: 'PK' },
      finalTouch: { actor: tw, tsMs: ctx.clock.ms(lastLogMs) },
    },
    { ensureAlerts }
  );
  return { ctx, result, summary: await summarize(ctx, { related: result.related.length }) };
};
