import React from 'react';
import type { InjectedIntl } from '@kbn/i18n-react';
interface Props {
    onCancel: () => void;
    onConfirm: () => void;
    intl: InjectedIntl;
}
export declare const ConfirmAlterActiveSpaceModal: React.FC<import("react-intl").WithIntlProps<Props>> & {
    WrappedComponent: React.ComponentType<Props>;
};
export {};
