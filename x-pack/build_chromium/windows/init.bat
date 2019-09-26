: This only needs to be run once per environment to set it up.
: This requires a GUI, as the VS installation is graphical.
: If initilization fails, you can simply install run the `install_vs.exe`

@echo off

: Install Visual Studio (this requires user interaction, and takes quite a while)
: Most of the subsequent commands can be run in parallel with this (downloading, unzipping,
: grabbing the source, etc). This must be completed before building, though.
@echo "Installing Visual Studio"

powershell -command "& {iwr -outf c:\chromium\install_vs.exe https://download.visualstudio.microsoft.com/download/pr/f9c35424-ffad-4b44-bb8f-d4e3968e90ce/f75403c967456e32e758ef558957f345/vs_community.exe}"

install_vs.exe --add Microsoft.VisualStudio.Workload.NativeDesktop --add Microsoft.VisualStudio.Component.VC.ATLMFC --includeRecommended

: Install Chromium's custom build tools
@echo "Installing Chromium build tools"

powershell -command "& {iwr -outf %~dp0../../depot_tools.zip https://storage.googleapis.com/chrome-infra/depot_tools.zip}"
powershell -command "& {Expand-Archive %~dp0../../depot_tools.zip -DestinationPath %~dp0../../depot_tools}"

: Set the environment variables required by depot_tools
@echo "When Visual Studio is installed, you need to enable the Windows SDK in Control Panel. After that, press <enter> here to continue initialization"

pause

SETX PATH "%~dp0..\..\depot_tools;%path%"
SETX DEPOT_TOOLS_WIN_TOOLCHAIN 0

call gclient

python %~dp0../init.py
