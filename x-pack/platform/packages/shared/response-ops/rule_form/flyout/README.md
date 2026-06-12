This export path is only for lazy loading the flyout. Importing `@kbn/response-ops-rule-form` directly generally increases a plugin's bundle size unnecessarily.

Flyout UI is handled at the root of this component to avoid UI glitches. We want to render loading states and the fully loaded flyout body within the same <EuiFlyout> component, otherwise the user will see multiple flyouts and overlay masks flickering in and out.

This should be the ONLY export path for contexts that use the rule form as a flyout and not as the full page.
