# @kbn/feedback-registry

Allowed questions for `@kbn/feedback-plugin`. The registry lazily loads only the set for the current app. Apps without an entry fall back to the default questions.

## Register application questions

Define at most two questions in `src/questions/<your_app>.ts`:

```ts
import type { FeedbackRegistryEntry } from '@kbn/ui-feedback';

export const questions: FeedbackRegistryEntry[] = [
  {
    id: 'my_app_experience',
    order: 1,
    question: 'Describe your experience',
    placeholder: {
      i18nId: 'xpack.feedbackRegistry.myAppExperiencePlaceholder',
      defaultMessage: 'Describe your experience',
    },
    ariaLabel: {
      i18nId: 'xpack.feedbackRegistry.myAppExperienceAriaLabel',
      defaultMessage: 'Describe your experience',
    },
  },
];
```

Add a lazy loader in `src/registry.ts`. The map key is the chrome app id:

```ts
async function myAppLoader() {
  const m = await import('./questions/my_app');
  return m.questions;
}

const feedbackRegistry: FeedbackRegistry = new Map([
  [DEFAULT_REGISTRY_ID, () => import('./questions/default').then((m) => m.questions)],
  ['myApp', myAppLoader],
]);
```

If you are unsure of the app id, open the feedback form on that page and evaluate:

```js
document.querySelector('[data-app-id]')?.getAttribute('data-app-id')
```
