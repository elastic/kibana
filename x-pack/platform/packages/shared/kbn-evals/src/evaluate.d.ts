import type { EvaluationSpecificWorkerFixtures } from './types';
/**
 * Test type for evaluations. Loads an inference client and a
 * executor client.
 */
export declare const evaluate: import("playwright/test").TestType<import("playwright/test").PlaywrightTestArgs & import("playwright/test").PlaywrightTestOptions & {
    context: import("playwright-core").BrowserContext;
} & {
    browserAuth: import("@kbn/scout").BrowserAuthFixture;
} & {
    page: import("@kbn/scout").ScoutPage;
    log: import("@kbn/scout").ScoutLogger;
} & {
    pageObjects: import("@kbn/scout").PageObjects;
} & {
    validateTags: void;
} & {
    perfTracker: import("@kbn/scout/src/playwright/fixtures/scope/test/performance/performance_tracker").PerformanceTracker;
}, import("playwright/test").PlaywrightWorkerArgs & import("playwright/test").PlaywrightWorkerOptions & import("@kbn/scout/src/playwright/fixtures/scope/worker").CoreWorkerFixtures & {
    esArchiver: import("@kbn/scout/src/playwright").EsArchiverFixture;
} & {
    linkedProject: import("@kbn/scout/src/playwright").LinkedProjectFixture;
} & {
    uiSettings: import("@kbn/scout/src/playwright/fixtures/scope/worker").UiSettingsFixture;
} & {
    apiServices: import("@kbn/scout").ApiServicesFixture;
} & {
    kbnUrl: import("@kbn/scout").KibanaUrl;
} & {
    config: import("@kbn/scout").ScoutTestConfig;
} & EvaluationSpecificWorkerFixtures>;
