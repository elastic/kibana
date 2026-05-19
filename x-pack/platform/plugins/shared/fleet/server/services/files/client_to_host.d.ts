import type { FleetFile, FleetToHostFileClientInterface } from './types';
import { FleetFromHostFilesClient } from './client_from_host';
import type { FleetFileUpdatableFields, HapiReadableStream } from './types';
export declare class FleetToHostFilesClient extends FleetFromHostFilesClient implements FleetToHostFileClientInterface {
    get(fileId: string): Promise<FleetFile>;
    create(fileStream: HapiReadableStream, agentIds: string[]): Promise<FleetFile>;
    update(fileId: string, updates?: Partial<FleetFileUpdatableFields>): Promise<FleetFile>;
    delete(fileId: string): Promise<void>;
}
