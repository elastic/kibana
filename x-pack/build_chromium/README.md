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

1. Login to our GCP instance [here using your okta credentials](https://console.cloud.google.com/).
2. Click the "Compute Engine" tab.
3. Ensure that `chromium-build-linux` and `chromium-build-windows-12-beefy` are there.
4. If #3 fails, you'll have to spin up new instances. Generally, these need `n1-standard-8` types or 8 vCPUs/30 GB memory.
5. Ensure that there's enough room left on the disk: 100GB is required. `ncdu` is a good linux util to verify what's claming space.

## Usage

```
export PATH=$HOME/chromium/depot_tools:$PATH
# Create a dedicated working directory for this directory of Python scripts.
mkdir ~/chromium && cd ~/chromium
# Copy the scripts from the Kibana repo to use them conveniently in the working directory
cp -r ~/path/to/kibana/x-pack/build_chromium .
# Install the OS packages, configure the environment, download the chromium source
python ./build_chromium/init.sh [arch_name]

# Run the build script with the path to the chromium src directory, the git commit id
python ./build_chromium/build.py <commit_id>

# You can add an architecture flag for ARM
python ./build_chromium/build.py <commit_id> arm64
```

## Getting the Commit ID
Getting `<commit_id>` can be tricky. The best technique seems to be:
1. Create a temporary working directory and intialize yarn
2. `yarn add puppeteer # install latest puppeter`
3. Look through puppeteer's node module files to find the "chromium revision" (a custom versioning convention for Chromium).
4. Use `https://crrev.com` and look up the revision and find the git commit info.

The official Chromium build process is poorly documented, and seems to have
breaking changes fairly regularly. The build pre-requisites, and the build
flags change over time, so it is likely that the scripts in this directory will
be out of date by the time we have to do another Chromium build.

This document is an attempt to note all of the gotchas we've come across while
building, so that the next time we have to tinker here, we'll have a good
starting point.

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
```
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
  - Get the ssh command in the [GCP console](https://console.cloud.google.com/) -> VM instances -> your-vm-name -> SSH -> gcloud
  - Their in-browser UI is kinda sluggish, so use the commandline tool

- Windows:
  - Install Microsoft's Remote Desktop tools
  - Get the RDP file in the [GCP console](https://console.cloud.google.com/) -> VM instances -> your-vm-name -> RDP -> Download the RDP file
  - Edit it in Microsoft Remote Desktop:
    - Display -> Resolution (1280 x 960 or something reasonable)
    - Local Resources -> Folders, then select the folder(s) you want to share, this is at least `build_chromium` folder
    - Save

## Initializing each VM / environment

In a VM, you'll want to use the init scripts to to initialize each environment.
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

- https://www.chromium.org/developers/how-tos/get-the-code/working-with-release-branches
- https://chromium.googlesource.com/chromium/src/+/HEAD/docs/windows_build_instructions.md
- https://chromium.googlesource.com/chromium/src/+/HEAD/docs/mac_build_instructions.md
- https://chromium.googlesource.com/chromium/src/+/HEAD/docs/linux/build_instructions.md
- Some build-flag descriptions: https://www.chromium.org/developers/gn-build-configuration
- The serverless Chromium project was indispensable: https://github.com/adieuadieu/serverless-chrome/blob/b29445aa5a96d031be2edd5d1fc8651683bf262c/packages/lambda/builds/chromium/build/build.sh
