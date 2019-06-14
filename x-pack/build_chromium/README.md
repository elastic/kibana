# Chromium build

We ship our own headless build of Chromium which is significantly smaller than the standard binaries shipped by Google. The scripts in this folder can be used to initialize the build environments and run the build on Mac, Windows, and Linux.

The official Chromium build process is poorly documented, and seems to have breaking changes fairly regularly. The build pre-requisites, and the build flags change over time, so it is likely that the scripts in this directory will be out of date by the time we have to do another Chromium build.

This document is an attempt to note all of the gotchas we've come across while building, so that the next time we have to tinker here, we'll have a good starting point.

# Before you begin
You'll need access to our GCP account, which is where we have two machines provisioned for the Linux and Windows builds. Mac builds can be achieved locally, and are a great place to start to gain familiarity.

1. Login to our GCP instance [here using your okta credentials](https://console.cloud.google.com/).
2. Click the "Compute Engine" tab.
3. Ensure that `chromium-build-linux` and `chromium-build-windows-12-beefy` are there.
4. If #3 fails, you'll have to spin up new instances. Generally, these need `n1-standard-8` types or 8 vCPUs/30 GB memory.
5. Ensure that there's enough room left on the disk. `ncdu` is a good linux util to verify what's claming space.

## Build args

Chromium is built via a build tool called "ninja". The build can be configured by specifying build flags either in an "args.gn" file or via commandline args. We have an "args.gn" file per platform:

- mac: darwin/args.gn
- linux: linux/args.gn
- windows: windows/args.gn

The various build flags are not well documented. Some are documented [here](https://www.chromium.org/developers/gn-build-configuration). Some, such as `enable_basic_printing = false`, I only found by poking through 3rd party build scripts.

As of this writing, there is an officially supported headless Chromium build args file for Linux: `build/args/headless.gn`. This does not work on Windows or Mac, so we have taken that as our starting point, and modified it until the Windows / Mac builds succeeded.

**NOTE:** Please, make sure you consult @elastic/kibana-security before you change, remove or add any of the build flags.

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

You only need to initialize each environment once. NOTE: on Mac OS you'll need to install XCode and accept the license agreement.

Create the build folder:

- Mac / Linux: `mkdir -p ~/chromium`
- Windows: `mkdir c:\chromium`

Copy the `x-pack/build-chromium` folder to each. Replace `you@your-machine` with the correct username and VM name:

- Mac: `cp -r ~/dev/elastic/kibana/x-pack/build_chromium ~/chromium/build_chromium`
- Linux: `gcloud compute scp --recurse ~/dev/elastic/kibana/x-pack/build_chromium you@your-machine:~/chromium/build_chromium --zone=us-east1-b`
- Windows: Copy the `build_chromium` folder via the RDP GUI into `c:\chromium\build_chromium`

There is an init script for each platform. This downloads and installs the necessary prerequisites, sets environment variables, etc.

- Mac: `~/chromium/build_chromium/darwin/init.sh`
- Linux: `~/chromium/build_chromium/linux/init.sh`
- Windows `c:\chromium\build_chromium\windows\init.bat`

In windows, at least, you will need to do a number of extra steps:

- Follow the prompts in the Visual Studio installation process, click "Install" and wait a while
- Once it's installed, open Control Panel and turn on Debugging Tools for Windows:
  - Control Panel → Programs → Programs and Features → Select the “Windows Software Development Kit” → Change → Change → Check “Debugging Tools For Windows” → Change
- Press enter in the terminal to continue running the init

## Building

Find the sha of the Chromium commit you wish to build. Most likely, you want to build the Chromium revision that is tied to the version of puppeteer that we're using.

Find the Chromium revision (modify the following command to be wherever you have the kibana source installed):

- `cat ~/dev/elastic/kibana/x-pack/node_modules/puppeteer-core/package.json | grep chromium_revision`
- Take the revision number from that, and tack it to the end of this URL: https://crrev.com
  - (For example: https://crrev.com/637110)
- Grab the SHA from there
  - (For example, rev 637110 has sha 2fac04abf6133ab2da2846a8fbd0e97690722699)

Note: In Linux, you should run the build command in tmux so that if your ssh session disconnects, the build can keep going. To do this, just type `tmux` into your terminal to hop into a tmux session. If you get disconnected, you can hop back in like so:

- SSH into the server
- Run `tmux list-sessions`
- Run `tmux switch -t {session_id}`, replacing {session_id} with the value from the list-sessions output

To run the build, replace the sha in the following commands with the sha that you wish to build:

- Mac: `python ~/chromium/build_chromium/build.py 2fac04abf6133ab2da2846a8fbd0e97690722699`
- Linux: `python ~/chromium/build_chromium/build.py 2fac04abf6133ab2da2846a8fbd0e97690722699`
- Windows: `python c:\chromium\build_chromium\build.py 2fac04abf6133ab2da2846a8fbd0e97690722699`

## Artifacts

After the build completes, there will be a .zip file and a .md5 file in `~/chromium/chromium/src/out/headless`. These are named like so: `chromium-{first_7_of_SHA}-{platform}`, for example: `chromium-4747cc2-linux`.

The zip files need to be deployed to s3. For testing, I drop them into `headless-shell-dev`, but for production, they need to be in `headless-shell`. And the `x-pack/plugins/reporting/server/browsers/chromium/paths.js` file needs to be upated to have the correct `archiveChecksum`, `archiveFilename`, `rawChecksum` and `baseUrl`. Below is a list of what the archive's are:

- `archiveChecksum`: The contents of the `.md5` file, which is the `md5` checksum of the zip file.
- `rawChecksum`: The `md5` checksum of the `headless_shell` binary itself.

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
- https://chromium.googlesource.com/chromium/src/+/master/docs/windows_build_instructions.md
- https://chromium.googlesource.com/chromium/src/+/master/docs/mac_build_instructions.md
- https://chromium.googlesource.com/chromium/src/+/master/docs/linux_build_instructions.md
- Some build-flag descriptions: https://www.chromium.org/developers/gn-build-configuration
- The serverless Chromium project was indispensable: https://github.com/adieuadieu/serverless-chrome/blob/b29445aa5a96d031be2edd5d1fc8651683bf262c/packages/lambda/builds/chromium/build/build.sh
