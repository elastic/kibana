import expect from 'expect.js';
import { stdin } from '../stdin';

describe('stdin', () => {
  it('resolves with input', async () => {
    process.stdin.removeAllListeners('readable');
    process.stdin.removeAllListeners('end');

    const promise = stdin();

    process.stdin.push('kib');
  	process.stdin.push('ana');
  	process.stdin.emit('end');

    const text = (await promise).trim();
    expect(text).to.eql('kibana');
  });
});
