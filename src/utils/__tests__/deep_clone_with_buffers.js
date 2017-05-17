import { deepCloneWithBuffers } from '../deep_clone_with_buffers';
import expect from 'expect.js';

describe('deepCloneWithBuffers()', function () {
  it('deep clones objects', function () {
    const source = {
      a: {
        b: {},
        c: {},
        d: [
          {
            e: 'f'
          }
        ]
      }
    };

    const output = deepCloneWithBuffers(source);

    expect(source.a).to.eql(output.a);
    expect(source.a).to.not.be(output.a);

    expect(source.a.b).to.eql(output.a.b);
    expect(source.a.b).to.not.be(output.a.b);

    expect(source.a.c).to.eql(output.a.c);
    expect(source.a.c).to.not.be(output.a.c);

    expect(source.a.d).to.eql(output.a.d);
    expect(source.a.d).to.not.be(output.a.d);

    expect(source.a.d[0]).to.eql(output.a.d[0]);
    expect(source.a.d[0]).to.not.be(output.a.d[0]);
  });

  it('copies buffers but keeps them buffers', function () {
    const input = new Buffer('i am a teapot', 'utf8');
    const output = deepCloneWithBuffers(input);

    expect(Buffer.isBuffer(input)).to.be.ok();
    expect(Buffer.isBuffer(output)).to.be.ok();
    expect(Buffer.compare(output, input));
    expect(output).to.not.be(input);
  });

  it('copies buffers that are deep', function () {
    const input = {
      a: {
        b: {
          c: new Buffer('i am a teapot', 'utf8')
        }
      }
    };
    const output = deepCloneWithBuffers(input);

    expect(Buffer.isBuffer(input.a.b.c)).to.be.ok();
    expect(Buffer.isBuffer(output.a.b.c)).to.be.ok();
    expect(Buffer.compare(output.a.b.c, input.a.b.c));
    expect(output.a.b.c).to.not.be(input.a.b.c);
  });
});
