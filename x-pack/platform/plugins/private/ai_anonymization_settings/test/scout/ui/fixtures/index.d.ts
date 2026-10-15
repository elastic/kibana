import type { PageObjects, ScoutParallelTestFixtures, ScoutParallelWorkerFixtures } from '@kbn/scout';
import { AnonymizationSettingsPage } from './page_objects';
export interface AnonymizationSettingsParallelTestFixtures extends ScoutParallelTestFixtures {
    pageObjects: PageObjects & {
        anonymizationSettings: AnonymizationSettingsPage;
    };
}
export declare const spaceTest: import("playwright/test").TestType<import("playwright/test").PlaywrightTestArgs & import("playwright/test").PlaywrightTestOptions & {
    context: import("playwright-core").BrowserContext;
} & {
    browserAuth: import("@kbn/scout").BrowserAuthFixture;
} & {
    page: import("@kbn/scout").ScoutPage;
} & {
    pageObjects: import("@kbn/scout/src/playwright/test/ui/single_thread_fixtures").PageObjects;
} & {
    network: import("@kbn/scout/src/playwright/fixtures/scope/test/network/network").Network;
    page: import("@kbn/scout").ScoutPage;
} & {
    validateTags: void;
} & AnonymizationSettingsParallelTestFixtures, import("playwright/test").PlaywrightWorkerArgs & import("playwright/test").PlaywrightWorkerOptions & import("@kbn/scout/src/playwright/fixtures/scope/worker/core_fixtures").BaseWorkerFixtures & {
    samlAuth: import("@kbn/scout").SamlAuth;
} & {
    scoutSpace: import("@kbn/scout").ScoutSpaceParallelFixture;
} & {
    apiClient: import("@kbn/scout").ApiClientFixture;
} & {
    apiServices: import("@kbn/scout").ApiServicesFixture;
} & {
    log: import("@kbn/scout").ScoutLogger;
    kbnUrl: import("@kbn/scout").KibanaUrl;
    scoutSpace: import("@kbn/scout").ScoutSpaceParallelFixture;
} & {
    scoutSpace: import("@kbn/scout").ScoutSpaceParallelFixture;
    config: import("@kbn/scout").ScoutTestConfig;
} & ScoutParallelWorkerFixtures>;
