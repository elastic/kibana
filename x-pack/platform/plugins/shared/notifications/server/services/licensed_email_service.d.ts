import type { Logger } from '@kbn/logging';
import type { ILicense, LicenseType } from '@kbn/licensing-types';
import { type Observable } from 'rxjs';
import type { AttachmentEmail, EmailService, HTMLEmail, PlainTextEmail } from './types';
export declare class LicensedEmailService implements EmailService {
    private emailService;
    private minimumLicense;
    private logger;
    private validLicense$;
    constructor(emailService: EmailService, license$: Observable<ILicense>, minimumLicense: LicenseType, logger: Logger);
    sendPlainTextEmail(payload: PlainTextEmail): Promise<void>;
    sendHTMLEmail(payload: HTMLEmail): Promise<void>;
    sendAttachmentEmail(payload: AttachmentEmail): Promise<void>;
    private checkValidLicense;
}
