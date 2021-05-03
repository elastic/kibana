# Chromium build

We ship our own headless build of Chromium which is significantly smaller than
the standard binaries shipped by Google. The scripts in this folder can be used
to accept a commit hash from the Chromium repository, and initialize the build
environments and run the build on Mac, Windows, and Linux.

## Before you begin

If you wish to use a remote VM to build, you'll need access to our GCP account,
which is where we have two machines provisioned for the Linux and Windows
builds. Mac builds can be achieved locally, and are a great place to start to
gain familiarity.

**NOTE:** Linux builds should be done in Ubuntu on x64 architecture. ARM builds
are created in x64 using cross-compiling. CentOS is not supported for building Chromium.

1. Login to our GCP instance [here using your okta credentials](https://console.cloud.google.com/).
2. Click the "Compute Engine" tab.
3. Find `chromium-build-linux` or `chromium-build-windows-12-beefy` and start the instance.
4. Install [Google Cloud SDK](https://cloud.google.com/sdk) locally to ssh into the GCP instance
5. System dependencies:
    - 8 CPU
    - 30GB memory
    - 80GB free space on disk (Try `ncdu /home` to see where space is used.)
    - git
    - python2 (`python` must link to `python2`)
    - lsb_release
    - tmux is recommended in case your ssh session is interrupted
    - "Cloud API access scopes": must have **read / write** scope for the Storage API
6. Copy the entire `build_chromium` directory from the `headless_shell_staging` bucket. To do this, use `gsutil rsync`:
   ```sh
   # This shows a preview of what would change by synchronizing the source scripts with the destination GCS bucket.
   # Remove the `-n` flag to enact the changes
   gsutil -m rsync -n -r x-pack/build_chromium gs://headless_shell_staging/build_chromium
   ```

## Build Script Usage

These commands show how to set up an environment to build:
```sh
# Allow our scripts to use depot_tools commands
export PATH=$HOME/chromium/depot_tools:$PATH

# Create a dedicated working directory for this directory of Python scripts.
mkdir ~/chromium && cd ~/chromium

# Copy the scripts from the Kibana team's GCS bucket
gsutil cp -r gs://headless_shell_staging/build_chromium .

# Install the OS packages, configure the environment, download the chromium source (25GB)
python ./build_chromium/init.py [arch_name]

# Run the build script with the path to the chromium src directory, the git commit hash
python ./build_chromium/build.py <commit_id> x64

# OR You can build for ARM
python ./build_chromium/build.py <commit_id> arm64
```

**NOTE:** The `init.py` script updates git config to make it more possible for
the Chromium repo to be cloned successfully. If checking out the Chromium fails
with "early EOF" errors, the instance could be low on memory or disk space.

## Getting the Commit Hash
If you need to bump the version of Puppeteer, you need to get a new git commit hash for Chromium that corresponds to the Puppeteer version.
```
node x-pack/dev-tools/chromium_version.js [PuppeteerVersion]
```

When bumping the Puppeteer version, make sure you also update the `.chromium-commit` file with the commit hash
for the current Chromium build, so we'll be able to construct a build pipeline for each OS (coming soon!).

## Build args

A good how-to on building Chromium from source is
[here](https://chromium.googlesource.com/chromium/src/+/master/docs/get_the_code.md).

There are documents for each OS that will explain how to customize arguments
for the build using the `gn` tool. Those instructions do not apply for the
Kibana Chromium build. Our `build.py` script ensure the correct `args.gn`
file gets used for build arguments.

We have an `args.gn` file per platform:

- mac: `darwin/args.gn`
- linux 64bit: `linux-x64/args.gn`
- windows: `windows/args.gn`
- ARM 64bit: linux-aarch64/args.gn

To get a list of the build arguments that are enabled, install `depot_tools` and run
`gn args out/headless --list`. It prints out all of the flags and their
settings, including the defaults.

The various build flags are not well documented. Some are documented
[here](https://www.chromium.org/developers/gn-build-configuration). 

As of this writing, there is an officially supported headless Chromium build
args file for Linux: `build/args/headless.gn`. This does not work on Windows or
Mac, so we have taken that as our starting point, and modified it until the
Windows / Mac builds succeeded.

**NOTE:** Please, make sure you consult @elastic/kibana-security before you change, remove or add any of the build flags.

## Building locally

You can skip the step of running `<os_name>/init.sh` for your OS if you already
have your environment set up, and the chromium source cloned.

To get the Chromium code, refer to the [documentation](https://chromium.googlesource.com/chromium/src/+/master/docs/get_the_code.md).
Install `depot_tools` as suggested, since it comes with useful scripts. Use the
`fetch` command to clone the chromium repository. To set up and run the build,
use the Kibana `build.py` script (in this directory).

It's recommended that you create a working directory for the chromium source
code and all the build tools, and run the commands from there:
```sh
mkdir ~/chromium && cd ~/chromium
cp -r ~/path/to/kibana/x-pack/build_chromium .
python ./build_chromium/init.sh [arch_name]
python ./build_chromium/build.py <commit_id>
```

## VMs

I ran Linux and Windows VMs in GCP with the following specs:

- 8 core vCPU
- 30GB RAM
- 128GB hard drive
- Ubuntu 18.04 LTS (not minimal)
- Windows Server 2016 (full, with desktop)

The more cores the better, as the build makes effective use of each. For Linux, Ubuntu is the only officially supported build target.

- Linux:
  - SSH in using [gcloud](https://cloud.google.com/sdk/)
  - Get the ssh command in the [GCP console](https://console.cloud.google.com/) -> VM instances -> your-vm-name -> SSH -> "View gcloud command"
  - Their in-browser UI is kinda sluggish, so use the commandline tool (Google Cloud SDK is required)

- Windows:
  - Install Microsoft's Remote Desktop tools
  - Get the RDP file in the [GCP console](https://console.cloud.google.com/) -> VM instances -> your-vm-name -> RDP -> Download the RDP file
  - Edit it in Microsoft Remote Desktop:
    - Display -> Resolution (1280 x 960 or something reasonable)
    - Local Resources -> Folders, then select the folder(s) you want to share, this is at least `build_chromium` folder
    - Save

## Initializing each VM / environment

In a VM, you'll want to use the init scripts to initialize each environment.
On Mac OS you'll need to install XCode and accept the license agreement.

Create the build folder:

- Mac / Linux: `mkdir -p ~/chromium`
- Windows: `mkdir c:\chromium`

Copy the `x-pack/build-chromium` folder to each. Replace `you@your-machine` with the correct username and VM name:

- Mac: `cp -r x-pack/build_chromium ~/chromium/build_chromium`
- Linux: `gcloud compute scp --recurse x-pack/build_chromium you@your-machine:~/chromium/ --zone=us-east1-b --project "XXXXXXXX"`
- Windows: Copy the `build_chromium` folder via the RDP GUI into `c:\chromium\build_chromium`

There is an init script for each platform. This downloads and installs the necessary prerequisites, sets environment variables, etc.

- Mac x64: `~/chromium/build_chromium/darwin/init.sh`
- Linux x64: `~/chromium/build_chromium/linux/init.sh`
- Linux arm64: `~/chromium/build_chromium/linux/init.sh arm64`
- Windows x64: `c:\chromium\build_chromium\windows\init.bat`

In windows, at least, you will need to do a number of extra steps:

- Follow the prompts in the Visual Studio installation process, click "Install" and wait a while
- Once it's installed, open Control Panel and turn on Debugging Tools for Windows:
  - Control Panel → Programs → Programs and Features → Select the “Windows Software Development Kit” → Change → Change → Check “Debugging Tools For Windows” → Change
- Press enter in the terminal to continue running the init

## Building

Note: In Linux, you should run the build command in tmux so that if your ssh session disconnects, the build can keep going. To do this, just type `tmux` into your terminal to hop into a tmux session. If you get disconnected, you can hop back in like so:

- SSH into the server
- Run `tmux list-sessions`
- Run `tmux switch -t {session_id}`, replacing {session_id} with the value from the list-sessions output

To run the build, replace the sha in the following commands with the sha that you wish to build:

- Mac x64: `python ~/chromium/build_chromium/build.py 312d84c8ce62810976feda0d3457108a6dfff9e6`
- Linux x64: `python ~/chromium/build_chromium/build.py 312d84c8ce62810976feda0d3457108a6dfff9e6`
- Linux arm64: `python ~/chromium/build_chromium/build.py 312d84c8ce62810976feda0d3457108a6dfff9e6 arm64`
- Windows x64: `python c:\chromium\build_chromium\build.py 312d84c8ce62810976feda0d3457108a6dfff9e6`

## Artifacts

After the build completes, there will be a .zip file and a .md5 file in `~/chromium/chromium/src/out/headless`. These are named like so: `chromium-{first_7_of_SHA}-{platform}-{arch}`, for example: `chromium-4747cc2-linux-x64`.

The zip files need to be deployed to GCP Storage. For testing, I drop them into `headless-shell-dev`, but for production, they need to be in `headless-shell`. And the `x-pack/plugins/reporting/server/browsers/chromium/paths.ts` file needs to be upated to have the correct `archiveChecksum`, `archiveFilename`, `binaryChecksum` and `baseUrl`. Below is a list of what the archive's are:

- `archiveChecksum`: The contents of the `.md5` file, which is the `md5` checksum of the zip file.
- `binaryChecksum`: The `md5` checksum of the `headless_shell` binary itself.

*If you're building in the cloud, don't forget to turn off your VM after retrieving the build artifacts!*

## Diagnosing runtime failures

After getting the build to pass, the resulting binaries often failed to run or would hang.

You can run the headless browser manually to see what errors it is generating (replace the `c:\dev\data` with the path to a dummy folder you've created on your system):

**Mac**
`headless_shell --disable-translate --disable-extensions --disable-background-networking --safebrowsing-disable-auto-update --disable-sync --metrics-recording-only --disable-default-apps --mute-audio --no-first-run --disable-gpu --no-sandbox --headless --hide-scrollbars --window-size=400,400 --remote-debugging-port=9221 https://example.com/`

**Linux**
`headless_shell --disable-translate --disable-extensions --disable-background-networking --safebrowsing-disable-auto-update --disable-sync --metrics-recording-only --disable-default-apps --mute-audio --no-first-run --disable-gpu --no-sandbox --headless --hide-scrollbars --window-size=400,400 --remote-debugging-port=9221 https://example.com/`

**Windows**
`headless_shell.exe --disable-translate --disable-extensions --disable-background-networking --safebrowsing-disable-auto-update --disable-sync --metrics-recording-only --disable-default-apps --mute-audio --no-first-run --disable-gpu --no-sandbox --headless --hide-scrollbars --window-size=400,400 --remote-debugging-port=9221 https://example.com/`

In the case of Windows, you can use IE to open `http://localhost:9221` and see if the page loads. In mac/linux you can just curl the JSON endpoints: `curl http://localhost:9221/json/list`.

## Resources

The following links provide helpful context about how the Chromium build works, and its prerequisites:

- Tools for Chromium version information: https://omahaproxy.appspot.com/
- https://www.chromium.org/developers/how-tos/get-the-code/working-with-release-branches
- https://chromium.googlesource.com/chromium/src/+/HEAD/docs/windows_build_instructions.md
- https://chromium.googlesource.com/chromium/src/+/HEAD/docs/mac_build_instructions.md
- https://chromium.googlesource.com/chromium/src/+/HEAD/docs/linux/build_instructions.md
- Some build-flag descriptions: https://www.chromium.org/developers/gn-build-configuration
- The serverless Chromium project was indispensable: https://github.com/adieuadieu/serverless-chrome/blob/b29445aa5a96d031be2edd5d1fc8651683bf262c/packages/lambda/builds/chromium/build/build.sh
