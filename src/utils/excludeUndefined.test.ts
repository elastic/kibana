import { excludeUndefined } from './excludeUndefined';

describe('excludeUndefined', () => {
  it('removes undefined values', () => {
    expect(
      excludeUndefined({
        foo: 'foo',
        bar: undefined,
        baz: null,
      })
    ).toEqual({ foo: 'foo' });
  });

  it('has the correct types', () => {
    const obj = excludeUndefined({
      foo: 'foo',
      bar: undefined,
      baz: null,
    });

    const res: {
      foo: string;
      bar: string;
      baz: null;
    } = {
      bar: 'bar',
      ...obj,
    };

    expect(res).toEqual({ bar: 'bar', foo: 'foo' });
  });
});
