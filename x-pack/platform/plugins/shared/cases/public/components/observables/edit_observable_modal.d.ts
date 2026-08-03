import { type FC } from 'react';
import type { Observable } from '../../../common/types/domain/observable/v1';
import { type CaseUI } from '../../containers/types';
export interface EditObservableModalProps {
    onCloseModal: VoidFunction;
    observable: Observable;
    caseData: CaseUI;
}
export declare const EditObservableModal: FC<EditObservableModalProps>;
