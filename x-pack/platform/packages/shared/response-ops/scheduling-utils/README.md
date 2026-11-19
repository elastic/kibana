# @kbn/response-ops-scheduling-utils

Helpers for rule and task schedules, shared by alerting v1 and v2:

- `isIntervalSchedule` / `isRruleSchedule`: tell the two schedule kinds apart.
- `getNextRruleOccurrence` / `getRruleOccurrences`: when an rrule schedule runs.
- `parseRruleString` / `transformRruleStringToRrule` / `transformRruleToRruleString`: convert between RFC 5545 RRULE strings and the `Rrule` object, using [rrule-temporal](https://github.com/ggaabe/rrule-temporal).
