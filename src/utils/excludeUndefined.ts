import { Assign } from 'utility-types';

type ExcludeUndefined<T extends Record<string, any>> = Assign<
  T,
  Partial<
    Pick<
      T,
      {
        [key in keyof T]-?: undefined extends T[key] ? key : never;
      }[keyof T]
    >
  >
>;

export function excludeUndefined<T extends Record<string, any>>(
  obj: T
): ExcludeUndefined<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v != null)
  ) as ExcludeUndefined<T>;
}
