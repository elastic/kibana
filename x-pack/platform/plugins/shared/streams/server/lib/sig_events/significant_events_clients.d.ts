import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { DetectionService } from './detections';
import type { DetectionClient } from './detections';
import { DiscoveryService } from './discoveries';
import type { DiscoveryClient } from './discoveries';
import { EventService } from './events';
import type { EventClient } from './events';
import { VerdictService } from './verdicts';
import type { VerdictClient } from './verdicts';
export interface SignificantEventsServices {
    detection: DetectionService;
    discovery: DiscoveryService;
    event: EventService;
    verdict: VerdictService;
}
export interface SignificantEventsClients {
    getDetectionClient: () => DetectionClient;
    getDiscoveryClient: () => DiscoveryClient;
    getEventClient: () => EventClient;
    getVerdictClient: () => VerdictClient;
}
export declare function createSignificantEventsServices(): SignificantEventsServices;
export declare function createSignificantEventsClients({ services, esClient, space, }: {
    services: SignificantEventsServices;
    esClient: ElasticsearchClient;
    space: string;
}): SignificantEventsClients;
export declare function initializeSignificantEventsTemplates({ esClient, logger, }: {
    esClient: ElasticsearchClient;
    logger: Logger;
}): Promise<void>;
