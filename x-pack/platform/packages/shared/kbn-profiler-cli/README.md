# @kbn/profiler-cli

Profile Kibana (or any other Node.js processes) while it's running, and open the CPU or Heap profile in Speedscope.

## Usage

### Profiling Modes

The profiler supports two modes:

1. **Backend Profiling** (default): Profile Node.js processes (CPU/Heap)
2. **Browser Profiling** (`--browser`): Profile frontend JavaScript using Playwright

### Backend Profiling (Running processes)

By default, the script looks for Kibana (or any Node process) running at 5603 or 5601. It will then either wait or run a command until completion.

Run a command by either preceding it with the profiler script:
`node scripts/profile.js -- $command`

Or by piping it in:
`$command | node scripts/profile.js`

You can also just run it until SIGINT:

`node scripts/profile.js`

Or with a timeout:

`node scripts/profile.js --timeout=10000`

### Browser Profiling

To profile frontend JavaScript in the browser:

```bash
node scripts/profile.js --browser --output-timestamp=20250103-120000 --url=http://localhost:5601
```

This will:

- Launch a Chromium browser with Playwright
- Navigate to the specified URL
- Start CPU profiling
- Wait for you to interact with the application
- Save the profile when you stop recording

The browser window must remain open until you stop the profiler. The profile will be saved to `/tmp/kbn-profiler-cli-profiles/`.

### Heap profiling

If you want to collect a heap profile, simply add `--heap`:

`node scripts/profile.js --heap --timeout=10000`

### Periodic writes (for long-running profiles)

When profiling long-running processes, profiles can grow very large and cause memory issues. Use `--periodic-write` to automatically write profiles to disk at regular intervals:

```bash
# Default: writes every ~8 minutes (50MB size)
node scripts/profile.js --periodic-write

# Write more frequently (every ~1.5 minutes with 10MB size)
node scripts/profile.js --periodic-write --max-profile-size=10485760
```

**How it works:**

- The profiler estimates profiles grow at ~1MB per 10 seconds
- When the estimated size reaches the limit, it stops, writes the profile, and starts a new session
- Each profile file represents a specific time window
- All profiles are written to `/tmp/kbn-profiler-cli-profiles/` and auto-discovered by the VSCode Profiling Visualizer extension

**Benefits:**

- Prevents memory issues from large profiles
- Enables continuous monitoring of long-running processes
- Time-based analysis with multiple profile snapshots
- Profiles automatically appear in the VSCode extension for analysis

### Selecting a process

By default, the profiler will look for a process running on 5603 or 5601 (in that order), where Kibana runs by default. But you can attach the profiler to any process. Add `--pid` to specify a specific process id:

`node scripts/profile.js --pid 14782`

Or, use `--grep` to list Node.js processes you can attach to:

`node scripts/profile.js --grep`

You can also already specify a filter:

`node scripts/profile.js --grep myProcess`

### Spawning a new process

You can also spawn a new process, so you can profile start to finish. This is useful for shorter-lived processes. Use the `--spawn` flag for this purpose:

`node scripts/profile.js --spawn -- node scripts/my_expensive_script`

The script will be executed with `NODE_OPTIONS=inspect-wait`, which will pause the script until the profiler script has attached to the debugger.

## Examples

### Commands

You can copy a curl request from the browser, and place it after the command:

`node scripts/profile.js --connections=10 --amount=50 -- curl ...`

You can also use stdin for this, for example:

`pbpaste | node scripts/profile.js`

When using stdin, take into consideration that there is some lag between starting the script and connecting the profiler, so the profiler might miss the first second or so of the running process.

You can also use any other command, like `autocannon`, `sleep` or `xargs`.

### SigInt

By default, the profiler will run until the process exits: `node scripts/profile.js`. This is useful when you have a long running process running separately and you want to collect the profile over a longer time period.

**Note:** For long-running profiles, use `--periodic-write` to prevent memory issues (see [Periodic writes](#periodic-writes-for-long-running-profiles) above). When you press Cmd+C, the profiler will gracefully exit and first write the profile to disk and open Speedscope.

## Note on tests

The current Jest tests are integration tests - they use real processes. On the lovely black box that is CI, they don't reliably work, so we skip them there. But please run them locally when making changes.
