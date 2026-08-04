# Significant Events app

Owner: `@elastic/obs-sig-events-team`

Browser-only plugin serving the Significant Events UI at `/app/significant_events`.

The application covers the Significant Events surface: streams onboarding overview,
knowledge indicators, rules (queries), detections, events, memory and settings. It
consumes the `significant_events` plugin (server APIs via the typed
`significantEventsRepositoryClient`).

The app is gated behind the Significant Events rollout feature flag
(`streams.significantEventsAvailable`), the Enterprise license and the pricing tier;
when unavailable it is hidden from navigation/global search and direct visits are
redirected to the Streams app.

The plugin's start contract exposes the availability gate (`availability$`) so
other plugins — notably `streams_app` — can gate sig-events entry points. Deep
links go through the share plugin locator registered under
`SIGNIFICANT_EVENTS_APP_LOCATOR_ID`.
