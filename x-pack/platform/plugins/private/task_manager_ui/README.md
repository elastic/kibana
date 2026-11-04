# Task Manager UI

Adds **Stack Management → Background tasks**, a read-only page listing the tasks in the Task
Manager index. Tasks are grouped into parent / sub-task trees, filterable by status, task type,
and id, with a details flyout showing a task's state, params, and tree roll-up.

The page is backed by the superuser-only internal routes of the `taskManager` plugin:

- `GET /internal/task_manager/_tasks`
- `GET /internal/task_manager/_task/{id}`
- `GET /internal/task_manager/_tree/{rootId}`
- `GET /internal/task_manager/_task_types`

It is a separate plugin so that `taskManager` (a dependency of almost every plugin) does not need a
browser bundle, and because `management → share → taskManager` would otherwise form a cycle.
