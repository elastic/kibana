export declare const MustacheInEmailRegExp: RegExp;
/** does the string contain `{{.*}}`? */
export declare function hasMustacheTemplate(string: string): boolean;
/** filter strings that do not contain `{{.*}}` */
export declare function withoutMustacheTemplate(strings: string[]): string[];
