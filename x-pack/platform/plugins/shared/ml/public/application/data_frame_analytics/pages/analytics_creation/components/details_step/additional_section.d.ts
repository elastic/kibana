import type { FC } from 'react';
import { type State } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import type { ActionDispatchers } from '../../../analytics_management/hooks/use_create_analytics_form/actions';
interface Props {
    formState: State['form'];
    setFormState: ActionDispatchers['setFormState'];
}
export declare const AdditionalSection: FC<Props>;
export {};
