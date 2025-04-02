# @kbn/profiler-cli

Profile Kibana (or any other Node.js processes) while it's running, and open the CPU or Heap profile in Speedscope.

## Usage

Run a command by either preceding it with the profiler script:
`node scripts/profile.js -- $command`

Or by piping it in:
`$command | node scripts/profile.js`

You can also just run it until SIGINT:

`node scripts/profile.js`

Or with a timeout:

`node scripts/profile.js --timeout=10000`

### Heap profiling

If you want to collect a heap profile, simply add `--heap`:

`node scripts/profile.js --heap --timeout=10000`

### Selecting a process

By default, the profiler will look for a process running on 5603 or 5601 (in that order), where Kibana runs by default. But you can attach the profiler to any process. Add `--pid` to specify a specific process id:

`node scripts/profile.js --pid 14782`

Or, use `--grep` to list Node.js processes you can attach to:

`node scripts/profile.js --grep`

You can also already specify a filter:

`node scripts/profile.js --grep myProcess`

## Examples

### Commands

You can copy a curl request from the browser, and place it after the command:

`node scripts/profile.js --connections=10 --amount=50 -- curl ...`

You can also use stdin for this, for example:

`pbpaste | node scripts/profile.js`

When using stdin, take into consideration that there is some lag between starting the script and connecting the profiler, so the profiler might miss the first second or so of the running process.

You can also use any other command, like `autocannon`, `sleep` or `xargs`.

### SigInt

By default, the profiler will run until the process exits:`node scripts/profile.js`. This is useful when you have a long running process running separately and you want to collect the profile over a longer time period. Be aware that this might cause memory issues because the profile will get huge. When you press Cmd+C, the profiler will gracefully exit and first write the profile to disk and open Speedscope.
