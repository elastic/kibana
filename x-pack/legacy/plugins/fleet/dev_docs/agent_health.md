# Agent Health/Status

The health of an agent is computed base on the time since the last agent check-in, and the errors found in the events during checkin.
We are going to report the health of agent differently depending of the type of the agents `EPHEMERAL`, `PERMANENT`, `TEMPORARY`.

### Status

## Inactive

An agent is marked as inactive:

- For all type of if the agent is unenrolled: the property `.active` is false on the agent saved object
- For `TEMPORARY` or `EPHEMERAL` agents if the last checkin is more than 3 times the configured polling interval (constant `AGENT_POLLING_THRESHOLD_MS`)

## Warning

This status is used only by `PERMANENT` agent id the last checkin is more than 2 times the configured polling interval

## Error

An agent is marked as error:

- if it contains error events from previouses checkin, (the property `error_events` on the saved object)
- for `PERMANENT` agent id the last checkin is more than 4 times the configured polling interval
