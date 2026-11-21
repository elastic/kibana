// Scenario C: a team without AI works a phishing report by hand (INV-240).
// The team chat and its thread are stored as record-level comments.
import { newCtx, runStandard, actorOf, createOrdered, summarize } from './common.mjs';

export const id = 'C';

/** Chat messages become comments targeting the record; thread replies point at their parent comment. */
const chatAsComments = async (ctx) => {
  const st = ctx.d.state;
  const top = st.msgs.map((m) => ({
    actor: actorOf(m.who),
    input: { kind: 'comment', text: ctx.clock.text(m.t), comment: { target_id: ctx.recordId }, created_at: ctx.clock.iso(m.ts) },
    key: m.k,
  }));
  const created = await createOrdered(ctx.recordId, top);
  const parentOf = {};
  created.forEach((item, i) => {
    parentOf[top[i].key] = item.id;
  });
  const replies = [];
  for (const [key, th] of Object.entries(st.threads ?? {})) {
    for (const m of th.msgs) {
      replies.push({
        ts: m.ts,
        actor: actorOf(m.who),
        input: { kind: 'comment', text: ctx.clock.text(m.t), comment: { target_id: ctx.recordId, parent_id: parentOf[key] }, created_at: ctx.clock.iso(m.ts) },
      });
    }
  }
  replies.sort((a, b) => a.ts - b.ts);
  if (replies.length) await createOrdered(ctx.recordId, replies);
  return { top: created.length, replies: replies.length };
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
      patches: () => [{ tsMs: ctx.clock.ms(t(9, 58, 0)), body: { owner: pk, actor: pk } }],
      recordComments: async (c) => {
        chat = await chatAsComments(c);
      },
      finalTouch: { actor: pk, tsMs: ctx.clock.ms(lastLogMs) },
    },
    { ensureAlerts: async () => [] }
  );
  return { ctx, result, summary: await summarize(ctx, { related: result.related.length, chat: `${chat.top} messages + ${chat.replies} replies` }) };
};
