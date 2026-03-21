import type { Logger } from '@kbn/logging';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { Runner, HooksServiceStart } from '@kbn/agent-builder-server';
import type { ToolsServiceStart } from '../tools';
import type { AgentsServiceStart } from '../agents';
import type { AttachmentServiceStart } from '../attachments';
import type { AnalyticsService, TrackingService } from '../../telemetry';
import type { SkillServiceStart } from '../skills';
export interface RunnerFactoryDeps {
    logger: Logger;
    elasticsearch: ElasticsearchServiceStart;
    security: SecurityServiceStart;
    uiSettings: UiSettingsServiceStart;
    savedObjects: SavedObjectsServiceStart;
    inference: InferenceServerStart;
    spaces: SpacesPluginStart | undefined;
    actions: ActionsPluginStart;
    toolsService: ToolsServiceStart;
    agentsService: AgentsServiceStart;
    attachmentsService: AttachmentServiceStart;
    skillServiceStart: SkillServiceStart;
    trackingService?: TrackingService;
    analyticsService?: AnalyticsService;
    hooks: HooksServiceStart;
}
export interface RunnerFactory {
    getRunner(): Runner;
}
