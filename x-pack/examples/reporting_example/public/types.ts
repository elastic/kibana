import { DeveloperExamplesSetup } from '../../../../examples/developer_examples/public';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';
import { ReportingStart } from '../../../plugins/reporting/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginStart {}

export interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}
export interface StartDeps {
  navigation: NavigationPublicPluginStart;
  reporting: ReportingStart;
}
