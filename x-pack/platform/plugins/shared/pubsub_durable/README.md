# pubsubDurable (PoC)

Durable, cross-node delivery for `core.pubsub`. Events are stored in the hidden `.kibana-pubsub-events`
index (one primary shard, so `_seq_no` is a total order). Task Manager runs one drain task per
consumer and topic (`pubsub:<consumer>:<topic>`), which reads events past a cursor kept in task state
and calls the consumer's handler. Delivery is at-least-once, in sequence order per consumer and topic.

Subscribe with `delivery: 'durable'` in `core.pubsub.subscribe`.
