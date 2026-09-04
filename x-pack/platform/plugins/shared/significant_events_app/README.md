# Significant Events app

Owner: `@elastic/obs-sig-events-team`

Browser-only plugin serving the Significant Events UI at `/app/significant_events`.

The application covers the Significant Events surface: streams onboarding overview,
knowledge indicators, rules (queries), detections, events, memory and settings. It
consumes the `significant_events` plugin (server APIs via the typed
`significantEventsRepositoryClient`).

Availability is decided server-side by `GET /internal/significant_events/availability`
(rollout feature flag, project type, pricing tier, Enterprise license and required
plugins). It gates app/deep-link visibility in global search and the page itself; when
unavailable the app is hidden from navigation/global search and direct visits show
`SignificantEventsNotEnabledPrompt`.

Deep links go through the share plugin locator registered under
`SIGNIFICANT_EVENTS_APP_LOCATOR_ID`.
