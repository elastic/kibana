# Significant Events app

Owner: `@elastic/obs-sig-events-team`

Browser-only plugin serving the Significant Events UI at `/app/significant_events`.

The application covers the Significant Events surface: streams onboarding overview,
knowledge indicators, rules (queries), detections, events, memory and settings. It
consumes the `significant_events` plugin (server APIs via the typed
`significantEventsRepositoryClient`).

The app is gated behind the Significant Events rollout feature flag
(`streams.significantEventsAvailable`), the Enterprise license and the pricing tier;
when unavailable it is hidden from navigation/global search and direct visits show
`SignificantEventsNotEnabledPrompt`.

## Start contract

- `availability$`: client-side gate (flag + license + pricing). Used for app/deep-link
  visibility in global search. Streams does **not** subscribe to this; it probes
  `GET /internal/significant_events/availability` via the optional `significant_events`
  start client instead (that endpoint also covers required plugins).
- `getKnowledgeIndicatorsPanel()`: factory returning a lazy embeddable panel for
  Streams stream overview. Pass `{ streamName }`. Providers and the panel chunk stay
  behind a dynamic import so they are not part of SEA page-load.

Deep links go through the share plugin locator registered under
`SIGNIFICANT_EVENTS_APP_LOCATOR_ID`.
