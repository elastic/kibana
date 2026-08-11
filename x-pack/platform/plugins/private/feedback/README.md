# @kbn/feedback-plugin

Universal way of giving feedback about Elastic in Kibana.

## Features

Feedback plugin registers a button in the Chrome global header area which is shown when all of these criteria are met:

- feedback is globally enabled (`core.notifications.feedback.isEnabled()`)
- telemetry is enabled (`telemetry.telemetryService.canSendTelemetry()`)
- telemetry is opted in (`telemetry.telemetryService.getIsOptedIn()`)

It also respects the global `Usage Collection` advanced setting.

Once clicked, a modal containing feedback questions and CSAT score buttons are displayed to the user. The questions are context-aware and are defined per application in `@kbn/feedback-registry` package. In case when an application has no defined questions a default set of questions is displayed.

Feedback, alongside other session data is sent using server-side EBT `feedback_submitted` event.
