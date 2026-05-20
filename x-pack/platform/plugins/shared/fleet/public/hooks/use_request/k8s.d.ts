import type { GetFullAgentManifestResponse } from '../../../common/types';
export declare const sendGetK8sManifest: (query?: {
    fleetServer?: string;
    enrolToken?: string;
}) => Promise<import("@kbn/es-ui-shared-plugin/public").SendRequestResponse<GetFullAgentManifestResponse, import("./use_request").RequestError>>;
