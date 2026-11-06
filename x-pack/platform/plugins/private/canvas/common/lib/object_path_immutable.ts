/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A self-contained reimplementation of the subset of `object-path-immutable`
 * (`set`, `del`, `assign`, `push`, `insert`) that Canvas relies on. The path
 * semantics are intentionally identical to the upstream package (MIT licensed):
 * string paths are split on `.`, numeric segments are treated as array indices,
 * and intermediate objects/arrays are created as needed. Every operation returns
 * a new object with structural sharing and never mutates its input.
 */

export type PathSegment = string | number;
export type Path = PathSegment | PathSegment[];

const hasOwnProperty = Object.prototype.hasOwnProperty;

const isNumber = (value: unknown): value is number => typeof value === 'number';
const isString = (value: unknown): value is string => typeof value === 'string';
const isArray = Array.isArray;

const isEmpty = (value: any): boolean => {
  if (isNumber(value)) {
    return false;
  }
  if (!value) {
    return true;
  }
  if (isArray(value) && value.length === 0) {
    return true;
  } else if (!isString(value)) {
    for (const key in value) {
      if (hasOwnProperty.call(value, key)) {
        return false;
      }
    }
    return true;
  }
  return false;
};

const assignToObj = (target: any, source: any): any => {
  for (const key in source) {
    if (hasOwnProperty.call(source, key)) {
      target[key] = source[key];
    }
  }
  return target;
};

// Numeric string keys are interpreted as array indices (e.g. `pages.0.style`).
const getKey = (key: string): PathSegment => {
  const intKey = parseInt(key, 10);
  if (intKey.toString() === key) {
    return intKey;
  }
  return key;
};

const clone = (obj: any, createIfEmpty?: boolean, assumeArray?: boolean): any => {
  if (obj == null) {
    if (createIfEmpty) {
      return assumeArray ? [] : {};
    }
    return obj;
  } else if (isArray(obj)) {
    return obj.slice();
  }
  return assignToObj({}, obj);
};

type ChangeCallback = (clonedObj: any, finalPath: PathSegment) => any;

const changeImmutable = (dest: any, src: any, path: Path, changeCallback: ChangeCallback): any => {
  if (isNumber(path)) {
    path = [path];
  }
  if (isEmpty(path)) {
    return src;
  }
  if (isString(path)) {
    return changeImmutable(dest, src, path.split('.').map(getKey), changeCallback);
  }

  const segments = path as PathSegment[];
  const currentPath = segments[0];

  if (!dest || dest === src) {
    dest = clone(src, true, isNumber(currentPath));
  }

  if (segments.length === 1) {
    return changeCallback(dest, currentPath);
  }

  if (src != null) {
    src = src[currentPath];
  }

  dest[currentPath] = changeImmutable(dest[currentPath], src, segments.slice(1), changeCallback);

  return dest;
};

export function set<T = object>(src: T, path: Path, value: any): T {
  if (isEmpty(path)) {
    return value;
  }
  return changeImmutable(null, src, path, (clonedObj, finalPath) => {
    clonedObj[finalPath] = value;
    return clonedObj;
  });
}

export function del<T = object>(src: T, path: Path): T {
  if (isEmpty(path)) {
    return undefined as unknown as T;
  }
  return changeImmutable(null, src, path, (clonedObj, finalPath) => {
    if (isArray(clonedObj)) {
      const index = finalPath as number;
      if (clonedObj[index] !== undefined) {
        clonedObj.splice(index, 1);
      }
    } else if (hasOwnProperty.call(clonedObj, finalPath)) {
      delete clonedObj[finalPath];
    }
    return clonedObj;
  });
}

export function assign<T = object>(src: T, path: Path, source: any): T {
  if (isEmpty(path)) {
    if (isEmpty(source)) {
      return src;
    }
    return assignToObj(clone(src), source);
  }
  return changeImmutable(null, src, path, (clonedObj, finalPath) => {
    const normalizedSource = Object(source);
    const target = clone(clonedObj[finalPath], true);
    assignToObj(target, normalizedSource);
    clonedObj[finalPath] = target;
    return clonedObj;
  });
}

export function push<T = object>(src: T, path: Path, ...values: any[]): T {
  if (isEmpty(path)) {
    return (!isArray(src) ? values : (src as any[]).concat(values)) as unknown as T;
  }
  return changeImmutable(null, src, path, (clonedObj, finalPath) => {
    if (!isArray(clonedObj[finalPath])) {
      clonedObj[finalPath] = values;
    } else {
      clonedObj[finalPath] = clonedObj[finalPath].concat(values);
    }
    return clonedObj;
  });
}

export function insert<T = object>(src: T, path: Path, value?: any, at?: number): T {
  const index = Math.trunc(Number(at)) || 0;
  if (isEmpty(path)) {
    if (!isArray(src)) {
      return [value] as unknown as T;
    }
    const firstPart = (src as any[]).slice(0, index);
    firstPart.push(value);
    return firstPart.concat((src as any[]).slice(index)) as unknown as T;
  }
  return changeImmutable(null, src, path, (clonedObj, finalPath) => {
    let arr = clonedObj[finalPath];
    if (!isArray(arr)) {
      if (arr != null && typeof arr !== 'undefined') {
        throw new Error(`Expected ${String(path)} to be an array. Instead got ${typeof arr}`);
      }
      arr = [];
    }
    const firstPart = arr.slice(0, index);
    firstPart.push(value);
    clonedObj[finalPath] = firstPart.concat(arr.slice(index));
    return clonedObj;
  });
}
