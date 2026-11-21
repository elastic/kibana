// Scenario C: a team without AI works a phishing report by hand (INV-240). It shows the whole Cases path:
// template fields (rules filled), case comments from several people including a reply, two assignees, task
// priorities, due dates and a subtask, and the custom paused status "Waiting on the employee".
// The team chat and its thread are case comments, each posted as the person who wrote it.
import { newCtx, runStandard, actorOf, summarize, postCaseComment, patchRecord, HOUR, DAY, MIN } from './common.mjs';

export const id = 'C';

const WAITING_STATUS_KEY = 'waiting_on_the_employee';
const WAITING_REASON = "Waiting on the employee's reply";

/** Chat messages become case comments; thread replies quote their parent comment (`reply_to`). */
const chatAsComments = async (ctx) => {
  const st = ctx.d.state;
  const parentOf = {};
  let top = 0;
  for (const m of st.msgs) {
    const comment = await postCaseComment(ctx.recordId, m.who, ctx.clock.text(m.t));
    parentOf[m.k] = comment.id;
    top += 1;
  }
  const replies = [];
  for (const [key, th] of Object.entries(st.threads ?? {})) {
    for (const m of th.msgs) replies.push({ ts: m.ts, who: m.who, parent: parentOf[key], text: ctx.clock.text(m.t) });
  }
  replies.sort((a, b) => a.ts - b.ts);
  for (const r of replies) await postCaseComment(ctx.recordId, r.who, r.text, r.parent);
  return { top, replies: replies.length };
};

export const run = async () => {
  const ctx = newCtx('C');
  const t = ctx.t;
  const pk = actorOf('PK');
  const lastLogMs = Math.max(...ctx.d.state.log.map((l) => l.ts));
  let chat;

  const result = await runStandard(
    ctx,
    {
      createdProto: t(9, 41, 0),
      creator: pk,
      scopeActor: 'PK',
      scopeCreatedProto: t(10, 5, 0),
      taskActorCode: 'PK',
      taskCreatedProto: t(9, 58, 0),
      timelineActor: 'PK',
      timelineCreatedProto: t(10, 0, 0),
      taskExtras: {
        // "Did any recipient click the link?" follow-up: open and three hours late.
        t4: { due: -3 * HOUR },
        t5: { due: 5 * HOUR },
        t6: {
          due: DAY,
          assignees: ['PK'],
          subtasks: [
            {
              title: 'Revoke active sessions for the two users who clicked',
              description: 'Sign them out of mail and the identity provider before the password reset.',
              priority: 'high',
              assignees: ['PK'],
              due: 6 * HOUR,
            },
          ],
        },
        t9: { due: 2 * DAY },
      },
      patches: () => [{ tsMs: ctx.clock.ms(t(9, 58, 0)), body: { owner: pk, actor: pk } }],
      assignees: { codes: ['PK', 'BW'], actor: 'PK', tsMs: ctx.clock.ms(t(10, 0, 0)) },
      recordComments: async (c) => {
        chat = await chatAsComments(c);
      },
      finalTouch: { actor: pk, tsMs: ctx.clock.ms(lastLogMs) },
      // TODO(pushed ticket, later item): push this record to a connector (ServiceNow / Jira) once the push route is in
      // the contract, so the "pushed ticket" state shows on INV-240. Not faked here: nothing writes a `record.pushed` entry.
      afterAll: async (c) => {
        // Last, backdated: the team asked the user for details and has been waiting since. The status pauses time
        // tracking, so the pause runs from this moment.
        const pausedAt = Math.min(c.clock.ms(lastLogMs) + 5 * MIN, c.clock.realNow - 2 * HOUR);
        await patchRecord(c.recordId, {
          status_key: WAITING_STATUS_KEY,
          pause_reason: WAITING_REASON,
          actor: pk,
          ts: new Date(pausedAt).toISOString(),
        });
      },
    },
    { ensureAlerts: async () => [] }
  );
  return { ctx, result, summary: await summarize(ctx, { related: result.related.length, chat: `${chat.top} comments + ${chat.replies} replies` }) };
};
