import type { CasesColumnSelection } from '../../../types';
import type { CaseUI } from '../../../../../../../common/ui/types';
export interface ListItemFieldContent {
    label: string;
    content: React.ReactNode;
    testSubj: string;
}
export interface ListItemOptionalFieldsProps {
    theCase: CaseUI;
    selectedFields: CasesColumnSelection[];
}
