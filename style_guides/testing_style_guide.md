# Testing style guide

## Principles

* A good test helps you identify what broke and how so you can fix it quickly. A bad test tells you something is broken but wastes your time trying to figure out what and how.
* Tests add time to the development cycle so we should write as few tests as possible, but no fewer.
* **Unit tests** should cover 70% of our needs. They'll ensure our fundamentals are sound.
* **Integrations tests** should cover 20% of our needs. They'll ensure our units work well together.
* **End-to-end tests** should cover 10% of our needs. They'll ensure our primary user flows are intact and alleviate the burden of manual testing from our QA engineers.

## Anti-patterns

### Too many assertions in a single test

A test's usability goes down as the number of assertions it contains goes up. The more assertions you make, the less clear the purpose of the test.

Instead of doing this, try one of these alternatives:

1. Try breaking up the test into multiple tests with individual assertions. This clarifies what you're testing.
2. Try using Jest snapshots in lieu of multiple assertions about the state of the UI. This makes your test more concise and maps it more clearly to the appearance of the UI.

### Testing concrete details instead of abstractions

Let's say a feature in your UI consists of a form and a submit button. If you want to test that this feature is available, then making an assertion against the form inputs and submit button would be a test of the feature's concrete details. This would be a brittle test that's prone to being broken by changes to the form's design or to the UX of the feature.

A better test would test for the abstract availability of this feature. For example, a `data-test-subj` selector on the container or some other proxy element to ensure the user has access to the feature.

### PageObject method does too much

### PageObject method contains conditional logic

### PageObject is bloated