import type { FunctionComponent } from 'react';
import type { ErrorMessage } from '../use_push_to_service/callout/types';
interface OwnProps {
    actionsErrors: ErrorMessage[];
}
type Props = OwnProps;
export declare const CasesTableHeader: FunctionComponent<Props>;
export {};
