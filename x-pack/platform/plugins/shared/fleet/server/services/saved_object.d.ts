/**
 * Escape a value with double quote to use with saved object search
 * Example: escapeSearchQueryPhrase('-test"toto') => '"-test\"toto""'
 * @param val
 */
export declare function escapeSearchQueryPhrase(val: string): string;
export declare const normalizeKuery: (savedObjectType: string, kuery: string) => string;
