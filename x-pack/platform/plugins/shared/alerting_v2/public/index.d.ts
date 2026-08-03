import { ContainerModule } from 'inversify';
export type { AlertingV2PublicStart, CreateRuleOptionsFlyoutLegacyItem } from './types';
export type { CreateRuleOptionsFlyoutProps } from './create_rule_options_flyout';
declare const pluginModule: ContainerModule;
export { pluginModule as module };
