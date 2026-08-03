import { type QueryCorrection } from './corrections';
interface CorrectWithAstResult {
    output: string;
    corrections: QueryCorrection[];
}
export declare const correctQueryWithAst: (query: string) => CorrectWithAstResult;
export {};
