import React from 'react';
import type { UninstallCommandTarget } from './types';
interface BaseProps {
    target: UninstallCommandTarget;
    onClose: () => void;
}
interface PropsWithPolicyId extends BaseProps {
    policyId: string;
    uninstallTokenId?: never;
}
interface PropsWithTokenId extends BaseProps {
    uninstallTokenId: string;
    policyId?: never;
}
export type UninstallCommandFlyoutProps = PropsWithPolicyId | PropsWithTokenId;
/** Flyout to show uninstall commands.
 *
 * Provide EITHER `policyId` OR `tokenId` for showing the token.
 */
export declare const UninstallCommandFlyout: React.FunctionComponent<UninstallCommandFlyoutProps>;
export {};
