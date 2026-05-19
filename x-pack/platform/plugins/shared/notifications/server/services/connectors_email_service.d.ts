import type { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { EmailService, PlainTextEmail, HTMLEmail, AttachmentEmail } from './types';
export declare class ConnectorsEmailService implements EmailService {
    private requesterId;
    private connectorId;
    private actionsClient;
    private logger;
    constructor(requesterId: string, connectorId: string, actionsClient: IUnsecuredActionsClient, logger: Logger);
    sendPlainTextEmail(params: PlainTextEmail): Promise<void>;
    sendHTMLEmail(params: HTMLEmail): Promise<void>;
    sendAttachmentEmail(params: AttachmentEmail): Promise<void>;
    private logEnqueueExecutionResponse;
}
