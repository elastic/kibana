export declare function splitIntoCommands(query: string): {
    name: string | undefined;
    command: string;
}[];
export declare function correctCommonEsqlMistakes(query: string): {
    isCorrection: boolean;
    input: string;
    output: string;
};
