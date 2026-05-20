import type { FC } from 'react';
import type { SAVE_STATE } from '../page';
interface CreateResultCalloutProps {
    saveState: SAVE_STATE;
    resultsUrl: string;
    onReset: () => {};
}
export declare const CreateResultCallout: FC<CreateResultCalloutProps>;
export {};
