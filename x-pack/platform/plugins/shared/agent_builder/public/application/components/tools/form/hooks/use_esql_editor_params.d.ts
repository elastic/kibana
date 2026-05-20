import type { EsqlParam } from '../types/tool_form_types';
export interface UseEsqlEditorParamsProps {
    params: EsqlParam[];
    addParam: (name: string) => void;
}
export declare const useEsqlEditorParams: ({ params, addParam }: UseEsqlEditorParamsProps) => void;
