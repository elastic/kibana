---
title: Lens Plugin Guide for Agents
---

# Lens (@kbn/lens-plugin)

Lens is the visualization editor for Kibana. It supports embedding visualizations, editing in-app, and saved object persistence.

## Architecture and entry points
- Public plugin: `public/plugin.ts`
- Server plugin: `server/plugin.tsx`
- Main editor app: `public/app_plugin/app.tsx`
- Embeddable: `public/react_embeddable/`
- Datasources: `public/datasources/` (form-based + ES|QL)
- Visualizations: `public/visualizations/`
- State management: `public/state_management/` (Redux)

## Embedding guidance
Prefer, in order:
1. **Dashboard** for most use cases (lowest maintenance).
2. **Lens embeddable** via `EmbeddableComponent` and `navigateToPrefilledEditor`.
3. **Custom rendering** only when Lens cannot support requirements.

## Constraints and performance
- Each embeddable fetches its own data; avoid many panels (> ~20) on one page.
- Keep `attributes` stable (`useMemo`) to avoid re-initialization and refetching.
- Experimental APIs may change without notice.

## Testing
- Unit tests: `x-pack/platform/plugins/shared/lens/jest.config.js`
- Functional tests: `x-pack/platform/test/functional/apps/lens/`
- API integration: `x-pack/platform/test/api_integration/apis/lens/`
- Performance journeys: `x-pack/performance/journeys_e2e/data_stress_test_lens*`
- Example: `yarn test:jest x-pack/platform/plugins/shared/lens`
- If a verifier sub-agent exists (e.g., `kibana-verifier` or `verifier`), run it and include its findings in the test notes.

## Escalation
If changes impact shared visualization contracts or embeddable APIs, coordinate with the owning teams before finalizing.

## References
- `x-pack/platform/plugins/shared/lens/readme.md`
- `x-pack/platform/test/functional/apps/lens/README.md`
- `x-pack/examples/embedded_lens_example`
