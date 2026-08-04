import type { EventsServiceStartContract } from '@kbn/agent-builder-browser/events';
import type { EventsService } from './events_service';
export declare const createPublicEventsContract: ({ eventsService, }: {
    eventsService: EventsService;
}) => EventsServiceStartContract;
