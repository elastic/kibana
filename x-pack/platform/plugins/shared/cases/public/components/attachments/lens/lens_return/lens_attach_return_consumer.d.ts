import React from 'react';
interface LensAttachReturnConsumerProps {
    caseId: string;
}
/**
 * Renders nothing; mounted on the case view so a Lens "Save and return" round
 * trip auto-attaches the saved object to this case. Gate the mount on
 * `xpack.cases.attachments.enabled` at the call site.
 */
export declare const LensAttachReturnConsumer: React.FC<LensAttachReturnConsumerProps>;
export {};
