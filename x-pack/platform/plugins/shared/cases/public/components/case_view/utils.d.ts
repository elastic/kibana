import type { CaseUI, UpdateByKey, UpdateKey } from '../../containers/types';
interface ProcessFieldUpdateParams {
    key: string;
    value: unknown;
    caseData: CaseUI;
    callUpdate: (updateKey: UpdateKey, updateValue: UpdateByKey['updateValue']) => void;
}
export declare const processFieldUpdate: ({ key, value, caseData, callUpdate, }: ProcessFieldUpdateParams) => void;
export {};
