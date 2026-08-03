/**
 * Correct some common ES|QL syntax and grammar mistakes that LLM can potentially do.
 *
 * Correcting the query is done in two steps:
 * 1. we try to correct the *syntax*, without AST (given it requires a valid syntax)
 * 2. we try to correct the *grammar*, using AST this time.
 */
export declare const correctCommonEsqlMistakes: (query: string) => {
    input: string;
    output: string;
    isCorrection: boolean;
};
