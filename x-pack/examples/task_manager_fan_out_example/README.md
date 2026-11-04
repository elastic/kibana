# Task Manager fan-out example

A parent task (`fanOutExample:parent`) that spawns four sub-tasks (`fanOutExample:child`), yields
while they run, joins their results once they have all ended, holds the results for two minutes so
they can be inspected, then cleans the children up.

Each child is a plain `setTimeout`. The `flaky` child throws on its first three runs (retried every
10s) and succeeds on the fourth; the parent is only woken once the child ends for good.

| key      | delay | fails first |
| -------- | ----- | ----------- |
| `fast`   | 3s    | 0           |
| `medium` | 15s   | 0           |
| `slow`   | 45s   | 0           |
| `flaky`  | 5s    | 3           |

Run Kibana with examples enabled:

```sh
yarn start --run-examples
```

Schedule a parent:

```sh
curl -u elastic:changeme -X POST -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  http://localhost:5601/internal/task_manager_fan_out_example/run -d '{"id":"fan-out-demo"}'
```

Watch it under **Stack Management → Background tasks** (filter by task id `fan-out-demo`), or via
`GET /internal/task_manager/_tree/fan-out-demo`.
