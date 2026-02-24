/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A directory that can contain files (and optionally subdirectories)
 */
export type FileDirectory<T extends Record<string, FileDirectory<any>> = {}> = {
  __canContainFiles: true;
} & T;

/**
 * A directory that can only contain other directories (no files allowed)
 */
export type Directory<T extends Record<string, Directory<any> | FileDirectory<any>>> = T;

/**
 * Extract all paths that point to FileDirectory (where files can be placed)
 */
export type FilePathsFromStructure<T, Prefix extends string = ''> = T extends {
  __canContainFiles: true;
}
  ? Prefix extends ''
    ? never // Skip empty prefix (root level)
    :
        | Prefix
        | {
            [K in keyof Omit<T, '__canContainFiles'> & string]: FilePathsFromStructure<
              T[K],
              `${Prefix}/${K}`
            >;
          }[keyof Omit<T, '__canContainFiles'> & string]
  : T extends object
  ? {
      [K in keyof T & string]: FilePathsFromStructure<
        T[K],
        Prefix extends '' ? K : `${Prefix}/${K}`
      >;
    }[keyof T & string]
  : never;

type ContainsSlash<S extends string> = S extends `${string}/${string}` ? true : false;

export type StringWithoutSlash<S extends string = string> = ContainsSlash<S> extends true
  ? never
  : S;

type ContainsSpace<S extends string> = S extends `${string} ${string}` ? true : false;

export type StringWithoutSpace<S extends string = string> = ContainsSpace<S> extends true
  ? never
  : S;
