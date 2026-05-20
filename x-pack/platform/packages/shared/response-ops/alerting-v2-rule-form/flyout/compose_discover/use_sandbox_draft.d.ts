import type { UseFormReturn } from 'react-hook-form';
import type { ComposeFormValues, RuleQuery } from './compose_form_types';
import type { SandboxDraft } from './types';
export declare function draftToRuleQuery(draft: SandboxDraft, tracking: boolean): RuleQuery;
export declare const useSandboxDraft: (methods: UseFormReturn<ComposeFormValues>) => {
    draft: SandboxDraft;
    setDraft: import("react").Dispatch<import("react").SetStateAction<SandboxDraft>>;
    syncForm: () => void;
};
